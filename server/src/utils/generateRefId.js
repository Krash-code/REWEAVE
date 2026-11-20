export default function generateRefId(objectId, date = new Date()) {
  return `RW-${date.getFullYear()}-${objectId.toString().toUpperCase()}`;
}