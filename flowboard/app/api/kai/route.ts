import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addCard } from "@/lib/mutations";

// ---------------------------------------------------------------------------
// Gemini client
// ---------------------------------------------------------------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ---------------------------------------------------------------------------
// Tool declarations (function-calling)
// ---------------------------------------------------------------------------
const tools: FunctionDeclaration[] = [
  {
    name: "create_task",
    description:
      "Creates a new task/card in the specified board and column. " +
      "If the user does not specify a column, use the first column ('To do').",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        board_id: {
          type: SchemaType.STRING,
          description: "The board ID where the task will be created",
        },
        column_id: {
          type: SchemaType.STRING,
          description: "The column ID where the task will be created (optional, defaults to first column)",
        },
        title: {
          type: SchemaType.STRING,
          description: "The task title",
        },
      },
      required: ["board_id", "title"],
    },
  },
  {
    name: "list_boards",
    description: "Lists all boards the user has access to.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "list_columns",
    description: "Lists the columns in a specific board.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        board_id: {
          type: SchemaType.STRING,
          description: "The board ID to list columns for",
        },
      },
      required: ["board_id"],
    },
  },
  {
    name: "list_tasks",
    description: "Lists all tasks/cards in a specific board.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        board_id: {
          type: SchemaType.STRING,
          description: "The board ID to list tasks for",
        },
      },
      required: ["board_id"],
    },
  },
];

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
function buildSystemPrompt(
  userName: string,
  boards: { id: string; title: string }[],
  activeBoardContext?: {
    board: { id: string; title: string };
    columns: { id: string; title: string }[];
    cardCount: number;
  } | null,
) {
  const boardList = boards.map((b) => `  - "${b.title}" (ID: ${b.id})`).join("\n");

  let activeCtx = "";
  if (activeBoardContext) {
    const cols = activeBoardContext.columns
      .map((c) => `    - "${c.title}" (ID: ${c.id})`)
      .join("\n");
    activeCtx = `

The user is currently viewing this board:
  Board: "${activeBoardContext.board.title}" (ID: ${activeBoardContext.board.id})
  Columns:
${cols}
  Total card count: ${activeBoardContext.cardCount}`;
  }

  return `You are an AI assistant named KAI. You are the intelligent assistant for the KoçSistem FlowBoard application.

## Who You Are
- Name: KAI (Koç AI)
- Role: Assistant for the FlowBoard project management application
- Communication language: Always respond in English

## About FlowBoard
FlowBoard is a Kanban-based project management tool. Key features:
- **Boards**: Represent projects, each board contains columns and cards
- **Columns**: Workflow stages like "To do", "In progress", "Done"
- **Cards/Tasks**: Units of work. Each card can have:
  - Title and description (rich text)
  - Priority (urgent, high, medium, low)
  - Labels
  - Assignees — each task can be assigned to one person
  - Watchers
  - Start and due dates
  - Checklist
  - Comments (with attachment support)
  - Story points
- **Sprints**: Board-level sprint management and archiving
- **Timeline**: Gantt-like project timeline view
- **Leaderboard**: Story points-based leaderboard
- **List View**: View all cards across boards in a single list

## User Information
Username: ${userName}
Accessible boards:
${boardList}${activeCtx}

## Your Capabilities
1. Answer questions about FlowBoard
2. List boards and columns
3. Create tasks (use the create_task function)
4. List tasks in a board
5. Provide guidance on using the application

## Rules
- Only help with FlowBoard-related topics
- For non-FlowBoard topics, say: "I'm the FlowBoard assistant — I can only help with application-related topics."
- When creating tasks, get the board and title information from the user
- If the user doesn't specify which board they mean and there is an active board, use that board
- Give short, clear, and helpful responses
- You may use emojis but don't overdo it`;
}

// ---------------------------------------------------------------------------
// Function execution helpers
// ---------------------------------------------------------------------------
async function executeFunction(
  fnName: string,
  args: Record<string, string>,
  userId: string,
): Promise<string> {
  switch (fnName) {
    case "list_boards": {
      const rows = await db`
        SELECT b.id, b.title, b.color FROM boards b
        JOIN board_members bm ON bm.board_id = b.id
        WHERE bm.user_id = ${userId}
        ORDER BY b.created_at DESC
      `;
      if (rows.length === 0) return JSON.stringify({ boards: [], message: "No boards found." });
      return JSON.stringify({
        boards: rows.map((r) => ({ id: r.id, title: r.title, color: r.color })),
      });
    }

    case "list_columns": {
      const rows = await db`
        SELECT id, title, position FROM columns
        WHERE board_id = ${args.board_id}
        ORDER BY position
      `;
      return JSON.stringify({
        columns: rows.map((r) => ({ id: r.id, title: r.title })),
      });
    }

    case "list_tasks": {
      const rows = await db`
        SELECT c.id, c.title, c.priority, c.due_at, col.title as column_title
        FROM cards c
        JOIN columns col ON col.id = c.column_id
        WHERE c.board_id = ${args.board_id}
        ORDER BY col.position, c.position
      `;
      return JSON.stringify({
        tasks: rows.map((r) => ({
          id: r.id,
          title: r.title,
          priority: r.priority,
          due_at: r.due_at,
          column: r.column_title,
        })),
      });
    }

    case "create_task": {
      let columnId = args.column_id;
      if (!columnId) {
        // Default to first column
        const cols = await db`
          SELECT id FROM columns
          WHERE board_id = ${args.board_id}
          ORDER BY position
          LIMIT 1
        `;
        if (cols.length === 0) return JSON.stringify({ error: "No columns found in this board." });
        columnId = cols[0].id as string;
      }

      // Get sibling positions for ordering
      const siblings = await db`
        SELECT position FROM cards
        WHERE column_id = ${columnId}
        ORDER BY position
      `;
      const positions = siblings.map((s) => s.position as string);

      const cardId = await addCard({
        boardId: args.board_id,
        columnId,
        title: args.title,
        siblingsPositions: positions,
      });

      // Get board and column names for response
      const boardRow = await db`SELECT title FROM boards WHERE id = ${args.board_id}`;
      const colRow = await db`SELECT title FROM columns WHERE id = ${columnId}`;

      return JSON.stringify({
        success: true,
        card_id: cardId,
        board_name: boardRow[0]?.title,
        column_name: colRow[0]?.title,
        title: args.title,
      });
    }

    default:
      return JSON.stringify({ error: "Unknown function" });
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { messages, activeBoardId } = body as {
      messages: { role: "user" | "model"; text: string }[];
      activeBoardId?: string;
    };

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    // Fetch user info + boards
    const [profileRows, boardRows] = await Promise.all([
      db`SELECT name FROM profiles WHERE id = ${userId}`,
      db`
        SELECT b.id, b.title FROM boards b
        JOIN board_members bm ON bm.board_id = b.id
        WHERE bm.user_id = ${userId}
        ORDER BY b.created_at DESC
      `,
    ]);

    const userName = (profileRows[0]?.name as string) || "Kullanıcı";
    const boards = boardRows.map((b) => ({ id: b.id as string, title: b.title as string }));

    // Active board context
    let activeBoardContext: {
      board: { id: string; title: string };
      columns: { id: string; title: string }[];
      cardCount: number;
    } | null = null;

    if (activeBoardId) {
      try {
        const [boardInfo, colInfo, cardCountInfo] = await Promise.all([
          db`SELECT id, title FROM boards WHERE id = ${activeBoardId}`,
          db`SELECT id, title FROM columns WHERE board_id = ${activeBoardId} ORDER BY position`,
          db`SELECT COUNT(*)::int AS cnt FROM cards WHERE board_id = ${activeBoardId}`,
        ]);
        if (boardInfo.length > 0) {
          activeBoardContext = {
            board: { id: boardInfo[0].id as string, title: boardInfo[0].title as string },
            columns: colInfo.map((c) => ({ id: c.id as string, title: c.title as string })),
            cardCount: Number(cardCountInfo[0]?.cnt ?? 0),
          };
        }
      } catch (dbErr) {
        console.error("[KAI] DB error fetching board context:", dbErr);
      }
    }

    const systemPrompt = buildSystemPrompt(userName, boards, activeBoardContext);

    // Build Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: tools }],
    });

    // Convert message history - filter out any empty or invalid entries
    const history = messages.slice(0, -1)
      .filter((m) => m.text && m.text.trim())
      .map((m) => ({
        role: m.role === "user" ? "user" as const : "model" as const,
        parts: [{ text: m.text }],
      }));

    const chat = model.startChat({ history });

    const lastMessage = messages[messages.length - 1].text;
    let result = await chat.sendMessage(lastMessage);

    // Handle function calls (loop for multi-step)
    let maxIterations = 5;
    while (maxIterations > 0) {
      const candidate = result.response.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      const fnCallPart = parts.find((p) => p.functionCall);

      if (!fnCallPart?.functionCall) break;

      const fnName = fnCallPart.functionCall.name;
      const fnArgs = (fnCallPart.functionCall.args as Record<string, string>) ?? {};

      console.log("[KAI] Function call:", fnName, fnArgs);

      let fnResult: string;
      try {
        fnResult = await executeFunction(fnName, fnArgs, userId);
      } catch (fnErr) {
        console.error("[KAI] Function execution error:", fnErr);
        fnResult = JSON.stringify({ error: "An error occurred during the operation." });
      }

      result = await chat.sendMessage([
        {
          functionResponse: {
            name: fnName,
            response: JSON.parse(fnResult),
          },
        },
      ]);

      maxIterations--;
    }

    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[KAI] Error:", errMsg);

    // User-friendly error messages
    let userMessage = "Something went wrong. Please try again.";
    if (errMsg.includes("Quota exceeded") || errMsg.includes("quota")) {
      userMessage = "API quota limit exceeded. Please try again in a few minutes.";
    } else if (errMsg.includes("API_KEY") || errMsg.includes("api key")) {
      userMessage = "API key is not configured. Please contact your administrator.";
    }

    return NextResponse.json(
      { error: userMessage },
      { status: 500 },
    );
  }
}

