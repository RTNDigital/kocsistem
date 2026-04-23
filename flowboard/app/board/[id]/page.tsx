import { BoardScreen } from "./BoardScreen";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BoardScreen boardId={id} />;
}
