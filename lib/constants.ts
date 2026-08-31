export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || 'blessedresult6@gmail.com'
)
  .trim()
  .toLowerCase()

export const ADMIN_OPS_PASSWORD =
  process.env.ADMIN_OPS_PASSWORD || 'change-me-ops'
