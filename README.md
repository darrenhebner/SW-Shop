#
Service Worker Side Rendering

This project is a proof of concept for rendering an app entirely inside of a service worker.
The templating, routing, and state are all managed inside of the SW.

By rendering inside the service worker, we can build a network resilient app that requires minimal client side JavaScript.

## How this app works
### First visit
1. App is rendered server side (TODO).
2. Service worker is installed, templates and resources are cached.

### Navigation within the app / repeat visit
1. Service worker intercepts the request.
2. The router determines which template to render.
3. Template is rendered to a `ReadableStream`.
4. The service worker responds to the request with the stream.

## Benefits to this approach
- Network resilient. Once the SW is installed, the app does not need to rely on the network. This results in a very fast app regardless of the network.
- No bulky client side JS bundle.
- Takes advantage of the platform. Traditional single page apps require you to include extra JS just to re-implement basic browser features. For example, page navigation and URL management.
- Streaming. We are able to start sending down pieces of the page as they are available. This allows us to get content to the user as soon as possible. Streaming is thrown away with client side JavaScript apps. Jake Archibald has written [quite a bit](https://jakearchibald.com/2016/fun-hacks-faster-content/) [about the benefits](https://jakearchibald.com/2016/streaming-template-literals/) [of streaming](https://jakearchibald.com/2016/streams-ftw/).
- By managing state via indexeddb, the app's state (in this case, the items in the cart) are persisted when the user revisits the site.

## TODOs
- [] Server side rendering using the same templates used in the service worker.
- [] Figure out a better routing system.
- [] Add PWA features like the manifest, icons, and splash screen.
- [] Use a real templating system. 😅
- [] Make it look nice. 💅
