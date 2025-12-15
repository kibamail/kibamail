import { BroadcastEditorClient } from "./_components/broadcast-editor-client";

export default async function BroadcastEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <BroadcastEditorClient broadcastId={id} />;
}
