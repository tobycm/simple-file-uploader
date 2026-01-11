const urlParams = new URLSearchParams(window.location.search);

const password = urlParams.get("password");

const passwordInput = document.getElementById("passwordInput") as HTMLInputElement;

if (password) {
  passwordInput.value = password;
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
