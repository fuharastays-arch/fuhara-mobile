export function createUploadId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (value) => {
    const random = Math.floor(Math.random() * 16);
    const digit = value === 'x' ? random : (random & 0x3) | 0x8;
    return digit.toString(16);
  });
}
