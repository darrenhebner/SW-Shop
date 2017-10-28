// Credit: Jake Archibald (https://jakearchibald.com/2016/streaming-template-literals/)

function templateStream(strings, ...values) {
  let items = [];

  strings.forEach((str, i) => {
    items.push(str);
    if (i in values) items.push(values[i]);
  });

  items = items.map(i => Promise.resolve(i)).entries();

  const encoder = new TextEncoder();

  return new ReadableStream({
    pull(controller) {
      const result = items.next();

      if (result.done) {
        controller.close();
        return;
      }

      return result.value[1].then(val => {
        if (val.getReader) {
          const reader = val.getReader();
          return reader.read().then(function process(result) {
            if (result.done) return;
            controller.enqueue(result.value);
            return reader.read().then(process);
          });
        }
        controller.enqueue(encoder.encode(val));
      });
    }
  });
}
