export function FeedbackBanner({ error, message, ok }: { error?: string | undefined; message?: string | undefined; ok?: string | undefined }) {
  if (!error && !ok) return null;
  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
        <p className="font-semibold">{error.replaceAll("_", " ")}</p>
        <p className="mt-1 text-danger/80">{message ?? "The action could not be completed."}</p>
      </div>
    );
  }
  return (
    <div role="status" className="rounded-2xl border border-positive/25 bg-positive/10 px-4 py-3 text-sm text-positive">
      {ok}
    </div>
  );
}
