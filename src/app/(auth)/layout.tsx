/**
 * Layout for unauthenticated pages (login, etc.).
 * Centres content and provides a clean, minimal background.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      {children}
    </main>
  );
}
