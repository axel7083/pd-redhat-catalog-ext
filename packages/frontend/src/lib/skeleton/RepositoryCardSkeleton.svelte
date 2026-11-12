<!-- same layout as RepositoryCard: logo tile, title, path, description, footer -->
<div
  class="rounded-lg border border-[var(--pd-content-bg)] flex flex-col bg-[var(--pd-content-card-bg)] min-h-36"
  role="status"
  aria-label="Loading repository card">
  <div class="flex flex-row grow gap-x-3 p-3 animate-pulse" aria-hidden="true">
    <div class="w-10 h-10 min-w-10 rounded-md bg-gray-900"></div>
    <div class="flex flex-col grow gap-y-2 pt-1">
      <div class="h-2.5 w-1/3 rounded bg-gray-900"></div>
      <div class="h-2 w-1/4 rounded bg-gray-900"></div>
      <div class="h-2 w-3/4 rounded bg-gray-900"></div>
    </div>
  </div>
  <div class="flex flex-row items-center justify-between px-3 pb-3 animate-pulse" aria-hidden="true">
    <div class="h-2 w-28 rounded bg-gray-900"></div>
    <div class="h-7 w-16 rounded bg-gray-900"></div>
  </div>
</div>
