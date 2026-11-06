// Découpe une question de confirmation en titre (jusqu'au premier « ? ») et explication (le reste),
// pour l'afficher dans la fenêtre de l'admin (components/admin-ask.tsx).
export function splitQuestion(question: string): { title: string; message: string | null } {
  const text = question.trim();
  const end = text.search(/\?(\s|$)/);
  if (end < 0) return { title: text, message: null };
  const rest = text.slice(end + 1).trim();
  return { title: text.slice(0, end + 1).trim(), message: rest || null };
}
