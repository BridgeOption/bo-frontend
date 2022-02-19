export const convertTime = time => {
  const date = new Date(time)
  const hour = date.getHours()
  const minute = date.getMinutes()
  return `${hour}:${minute}`
}
