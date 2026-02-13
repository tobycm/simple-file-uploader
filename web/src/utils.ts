export const a = (url: string, content?: string) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${content || url}</a>`;

export const joinUrl = (...components: (string | null | undefined)[]) =>
  components
    .map((comp, index) => {
      if (index === 0) {
        // First component: remove trailing slash
        return comp?.replace(/\/+$/, "") || "";
      } else {
        // Other components: remove leading and trailing slashes
        return comp?.replace(/^\/+|\/+$/g, "") || "";
      }
    })
    .filter(Boolean) // Remove empty components
    .join("/");
