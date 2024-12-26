const getExt = (url = "", tags = []) => {
  const ext = url.split(".").pop().toUpperCase();
  switch (ext) {
    case "PNG":
    case "JPG":
    case "JPEG":
    case "WEBP":
      return "photo";
    case "GIF":
      return "gif";
    case "MP4":
    case "MKV":
    case "MOV":
    case "WEBM":
      return "video";
    default:
      for (let tag of tags) {
        switch (tag) {
          case "sound":
            return "video";
          case "animated":
          case "gif":
            return "gif";
        }
      }
      return "photo";
  }
};

const chunkArray = (
  result = "",
  words = [],
  maxLength = 1024,
  force = false,
) => {
  for (let word of words) {
    if (result.length + word.length + 1 <= maxLength) {
      result += word + " ";
    } else if (force) {
      return result;
    }
  }

  return result;
};

export { chunkArray, getExt };
