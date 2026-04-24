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
      "Kullanıcının belirttiği board ve kolonda yeni bir task/kart oluşturur. " +
      "Eğer kullanıcı kolon belirtmezse ilk kolonu ('To do') kullan.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        board_id: {
          type: SchemaType.STRING,
          description: "Task'ın oluşturulacağı board ID",
        },
        column_id: {
          type: SchemaType.STRING,
          description: "Task'ın oluşturulacağı kolon ID (opsiyonel, verilmezse ilk kolon)",
        },
        title: {
          type: SchemaType.STRING,
          description: "Task başlığı",
        },
      },
      required: ["board_id", "title"],
    },
  },
  {
    name: "list_boards",
    description: "Kullanıcının erişebildiği tüm boardları listeler.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "list_columns",
    description: "Belirli bir board'daki kolonları (sütunları) listeler.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        board_id: {
          type: SchemaType.STRING,
          description: "Kolonları listelenecek board ID",
        },
      },
      required: ["board_id"],
    },
  },
  {
    name: "list_tasks",
    description: "Belirli bir board'daki tüm task/kartları listeler.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        board_id: {
          type: SchemaType.STRING,
          description: "Taskları listelenecek board ID",
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

Kullanıcının şu an aktif olarak baktığı board:
  Board: "${activeBoardContext.board.title}" (ID: ${activeBoardContext.board.id})
  Kolonlar:
${cols}
  Toplam kart sayısı: ${activeBoardContext.cardCount}`;
  }

  return `Sen KAI adında bir AI asistansın. KoçSistem FlowBoard uygulamasının akıllı yardımcısısın.

## Kim Olduğun
- Adın: KAI (Koç AI)
- Rolün: FlowBoard proje yönetim uygulamasının asistanı
- İletişim dilin: Kullanıcı hangi dilde yazıyorsa o dilde cevap ver (genellikle Türkçe)

## FlowBoard Hakkında
FlowBoard, Kanban tabanlı bir proje yönetim aracıdır. Temel özellikler:
- **Boardlar**: Projeleri temsil eder, her boardda kolonlar ve kartlar bulunur
- **Kolonlar**: "To do", "In progress", "Done" gibi iş akışı aşamaları
- **Kartlar/Tasklar**: Yapılacak iş birimleri. Her kart şunlara sahip olabilir:
  - Başlık ve açıklama (zengin metin)
  - Öncelik (urgent, high, medium, low)
  - Etiketler (labels)
  - Atananlar (assignees) — her task'a tek kişi atanır
  - İzleyiciler (watchers)
  - Başlangıç ve bitiş tarihleri
  - Kontrol listesi (checklist)
  - Yorumlar (attachments destekli)
  - Story points
- **Sprintler**: Board bazlı sprint yönetimi ve arşivleme
- **Timeline**: Gantt benzeri proje zaman çizelgesi
- **Leaderboard**: Story points bazlı liderlik tablosu
- **List View**: Tüm boardlardaki kartları tek listede görme

## Kullanıcı Bilgisi
Kullanıcı adı: ${userName}
Erişebildiği boardlar:
${boardList}${activeCtx}

## Yapabileceklerin
1. FlowBoard hakkında soruları cevapla
2. Board ve kolonları listele
3. Task oluştur (create_task fonksiyonunu kullan)
4. Board'daki taskları listele
5. Uygulama kullanımı hakkında rehberlik et

## Kurallar
- Sadece FlowBoard ile ilgili konularda yardım et
- FlowBoard dışı konularda: "Ben FlowBoard asistanıyım, sadece uygulama ile ilgili konularda yardımcı olabilirim." de
- Task oluştururken kullanıcıdan board ve başlık bilgisini al
- Eğer kullanıcı hangi board'u kastettiğini belirtmezse ve aktif board varsa, o board'u kullan
- Kısa, net ve yardımsever cevaplar ver
- Emoji kullanabilirsin ama abartma`;
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
      if (rows.length === 0) return JSON.stringify({ boards: [], message: "Hiç board bulunamadı." });
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
        if (cols.length === 0) return JSON.stringify({ error: "Board'da kolon bulunamadı." });
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
      return JSON.stringify({ error: "Bilinmeyen fonksiyon" });
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
    }

    const systemPrompt = buildSystemPrompt(userName, boards, activeBoardContext);

    // Build Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: tools }],
    });

    // Convert message history
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: m.text }],
    }));

    const chat = model.startChat({ history });

    const lastMessage = messages[messages.length - 1].text;
    let response = await chat.sendMessage(lastMessage);

    // Handle function calls (loop for multi-step)
    let maxIterations = 5;
    while (maxIterations > 0) {
      const candidate = response.response.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      const fnCall = parts.find((p) => p.functionCall);

      if (!fnCall?.functionCall) break;

      const { name, args } = fnCall.functionCall;
      const result = await executeFunction(
        name,
        (args as Record<string, string>) ?? {},
        userId,
      );

      response = await chat.sendMessage([
        {
          functionResponse: {
            name,
            response: { result: JSON.parse(result) },
          },
        },
      ]);

      maxIterations--;
    }

    const text = response.response.text();

    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("[KAI] Error:", err);
    return NextResponse.json(
      { error: "Bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
