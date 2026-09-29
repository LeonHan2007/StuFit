export function Page({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="mx-auto max-w-5xl px-4 pt-7">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      <main className="mx-auto max-w-5xl flex-1 px-4 py-8 pb-32">{children}</main>
    </>
  );
}
