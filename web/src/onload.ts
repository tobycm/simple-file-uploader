const urlParams = new URLSearchParams(window.location.search);

const password = urlParams.get("password");

const passwordInput = document.getElementById("passwordInput") as HTMLInputElement;
const passwordWarning = document.getElementById("passwordWarning") as HTMLSpanElement;

if (password) {
  passwordInput.value = password;
  passwordWarning.textContent = "Prefilled from URL. Don't change unless you know what you are doing.";
}

passwordInput.addEventListener("input", () => {
  const params = new URLSearchParams(window.location.search);
  if (passwordInput.value) {
    params.set("password", passwordInput.value);
  } else {
    params.delete("password");
  }
  const newUrl =
    window.location.protocol + "//" + window.location.host + window.location.pathname + (params.toString() ? "?" + params.toString() : "");

  window.history.replaceState({}, "", newUrl);
});

const folder = urlParams.get("folder");

const folderInput = document.getElementById("folder") as HTMLInputElement;

if (folder) {
  folderInput.value = folder;
}

folderInput.addEventListener("input", () => {
  const params = new URLSearchParams(window.location.search);
  if (folderInput.value) {
    params.set("folder", folderInput.value);
  } else {
    params.delete("folder");
  }
  const newUrl =
    window.location.protocol + "//" + window.location.host + window.location.pathname + (params.toString() ? "?" + params.toString() : "");

  window.history.replaceState({}, "", newUrl);
});
