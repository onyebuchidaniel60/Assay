export function FeedbackBanner({ error, message, ok }: { error?: string | undefined; message?: string | undefined; ok?: string | undefined }) {
  if (!error && !ok) return null;
  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-danger/30 bg-[#fee4e2] px-4 py-3 text-sm text-danger">
        <p className="font-semibold">{error.replaceAll("_", " ")}</p>
        <p className="mt-1 text-danger">{message ?? "The action could not be completed."}</p>
      </div>
    );
  }
  return (
    <div role="status" className="rounded-2xl border border-positive/30 bg-[#e6f4ed] px-4 py-3 text-sm font-medium text-positive">
      {ok}
    </div>
  );
}
