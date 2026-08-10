// Currency formatter for Pakistan
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "—"
  return `PKR ${Number(amount).toLocaleString("en-PK")}`
}

export const formatCurrencyShort = (amount) => {
  if (!amount && amount !== 0) return "—"
  const num = Number(amount)
  if (num >= 10000000) return `PKR ${(num / 10000000).toFixed(1)} Cr`
  if (num >= 100000)   return `PKR ${(num / 100000).toFixed(1)} Lac`
  if (num >= 1000)     return `PKR ${(num / 1000).toFixed(0)}K`
  return `PKR ${num.toLocaleString("en-PK")}`
}

export const formatDate = (date) => {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-PK", {
    day: "2-digit", month: "long", year: "numeric"
  })
}

export const formatDateShort = (date) => {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-PK", {
    day: "2-digit", month: "short", year: "numeric"
  })
}