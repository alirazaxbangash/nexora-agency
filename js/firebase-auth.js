// Firebase Authentication for Nexora Agency.
import { auth, db } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const page = document.body.dataset.page;
const form = document.querySelector("#auth-form");
const googleButton = document.querySelector("[data-google]");

function showMessage(message, isError = false) {
  let note = document.querySelector(".form-note");
  if (!note) {
    note = document.createElement("p");
    note.className = "form-note";
    (form || document.querySelector("main") || document.body).appendChild(note);
  }
  note.textContent = message;
  note.setAttribute("role", "status");
  note.style.color = isError ? "#ff8585" : "#a8f0c6";
}

function setLoading(button, loading, originalHTML) {
  if (!button) return;
  button.disabled = loading;
  button.innerHTML = loading ? "Please wait…" : originalHTML;
}

function readableError(error) {
  const messages = {
    "auth/email-already-in-use": "This email already has an account. Please sign in.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Your password is too weak. Use at least 8 characters.",
    "auth/invalid-credential": "Incorrect email or password. Please check your details.",
    "auth/user-not-found": "No account found with these details.",
    "auth/wrong-password": "Incorrect email or password. Please try again.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "Network error. Check your internet connection.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase.",
    "auth/unauthorized-domain": "This website domain is not authorized in Firebase Authentication settings.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled. You can try again.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in popup. Allow popups for this website and try again.",
    "auth/cancelled-popup-request": "A Google sign-in window is already opening. Please wait a moment.",
    "auth/account-exists-with-different-credential": "An account already exists with this email using a different sign-in method. Sign in with that method first."
  };
  return messages[error.code] || `Something went wrong: ${error.message || error.code || "Unknown error"}`;
}

// Account-aware navigation: hide every Sign In / Sign Up link after Firebase confirms a session.
onAuthStateChanged(auth, async (user) => {
  // Show the profile-menu shortcut only for the owner's verified account.
  // The admin page still performs its own authorization check before rendering protected content.
  const showAdminShortcut = Boolean(
    user && user.emailVerified && user.email?.trim().toLowerCase() === "alirazaxbangash@gmail.com"
  );
  document.querySelectorAll("a").forEach((link) => {
    let pathname = "";
    try { pathname = new URL(link.href, window.location.href).pathname.toLowerCase(); } catch (_) {}
    const isGuestAccountLink = /\/(sign-in|sign-up)\.html$/.test(pathname) || /create account/i.test(link.textContent || "");
    if (isGuestAccountLink) {
      link.hidden = Boolean(user);
      link.setAttribute("aria-hidden", user ? "true" : "false");
      if (user) link.setAttribute("tabindex", "-1");
      else link.removeAttribute("tabindex");
    }
  });

  document.querySelectorAll(".avatar").forEach((avatar) => {
    const source = (user?.displayName || user?.email?.split("@")[0] || "").trim();
    avatar.textContent = user ? (Array.from(source)[0] || "A").toLocaleUpperCase() : "N";
    avatar.setAttribute("aria-label", user ? `${source || user.email} profile menu` : "Sign in to your profile");
    avatar.title = user ? (user.displayName || user.email || "Profile") : "Sign in";
    avatar.style.cursor = "pointer";
    const prefix = window.location.pathname.toLowerCase().includes("/pages/") ? "" : "pages/";
    if (!avatar.dataset.accountMenuReady) {
      const wrap = document.createElement("div");
      wrap.className = "account-menu-wrap";
      avatar.parentNode.insertBefore(wrap, avatar);
      wrap.appendChild(avatar);
      const menu = document.createElement("div");
      menu.className = "account-dropdown";
      menu.hidden = true;
      menu.setAttribute("role", "menu");
      wrap.appendChild(menu);
      avatar.dataset.accountMenuReady = "true";
      avatar.addEventListener("click", (event) => {
        event.preventDefault();
        if (!auth.currentUser) {
          window.location.href = prefix + "sign-in.html";
          return;
        }
        const dropdown = avatar.parentElement.querySelector(".account-dropdown");
        const willOpen = dropdown.hidden;
        document.querySelectorAll(".account-dropdown").forEach((item) => { item.hidden = true; });
        dropdown.hidden = !willOpen;
        avatar.setAttribute("aria-expanded", String(willOpen));
      });
    }
    avatar.href = user ? "#" : prefix + "sign-in.html";
    const menu = avatar.parentElement.querySelector(".account-dropdown");
    if (menu) {
      menu.innerHTML = user ? `
        <div class="account-dropdown-user"><span class="account-dropdown-initial">${escapeHTML((source.charAt(0) || "A").toUpperCase())}</span><div><strong>${escapeHTML(user.displayName || source || "Account")}</strong><small>${escapeHTML(user.email || "")}</small></div></div>
        <div class="account-dropdown-divider"></div>
        <a role="menuitem" href="${prefix}dashboard.html?tab=overview"><span>▦</span>Dashboard</a>
        <a role="menuitem" href="${prefix}dashboard.html?tab=orders"><span>▣</span>Orders</a>
        <a role="menuitem" href="${prefix}dashboard.html?tab=messages"><span>◌</span>Messages</a>
        <a role="menuitem" href="${prefix}dashboard.html?tab=payments"><span>▤</span>Payment History</a>
        <a role="menuitem" href="${prefix}dashboard.html?tab=settings"><span>⚙</span>Settings</a>
        ${showAdminShortcut ? `<a role="menuitem" href="${prefix}admin.html"><span>✦</span>Admin Panel</a>` : ""}
        <div class="account-dropdown-divider"></div>
        <button type="button" class="account-dropdown-signout" data-account-signout><span>↪</span>Sign Out</button>
      ` : "";
      menu.hidden = !user || menu.hidden;
      avatar.setAttribute("aria-expanded", "false");
    }
  });
});

// Close the profile menu when clicking elsewhere or pressing Escape.
document.addEventListener("click", (event) => {
  if (!event.target.closest(".account-menu-wrap")) {
    document.querySelectorAll(".account-dropdown").forEach((menu) => { menu.hidden = true; });
    document.querySelectorAll(".avatar").forEach((avatar) => avatar.setAttribute("aria-expanded", "false"));
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.querySelectorAll(".account-dropdown").forEach((menu) => { menu.hidden = true; });
    document.querySelectorAll(".avatar").forEach((avatar) => avatar.setAttribute("aria-expanded", "false"));
  }
});

// Sign out is available only from the Settings section. Use delegation because
// the dashboard content (including this button) is rendered dynamically by app.js.
document.addEventListener("click", async (event) => {
  const menuSignOut = event.target.closest("[data-account-signout]");
  const settingsSignOut = event.target.closest("#settings-signout");
  const signOutButton = menuSignOut || settingsSignOut;
  if (!signOutButton) return;
  event.preventDefault();
  if (signOutButton.disabled) return;
  const originalText = signOutButton.innerHTML;
  signOutButton.disabled = true;
  signOutButton.textContent = "Signing out…";
  try {
    await signOut(auth);
    window.location.replace(new URL("../index.html", window.location.href).href);
  } catch (error) {
    const message = readableError(error);
    let note = document.querySelector("#settings-signout-message");
    if (!note) {
      note = document.createElement("p");
      note.id = "settings-signout-message";
      note.className = "form-note";
      signOutButton.insertAdjacentElement("afterend", note);
    }
    note.textContent = message;
    note.style.color = "#ff8585";
    signOutButton.disabled = false;
    signOutButton.innerHTML = originalText;
  }
});

if (form && page === "sign-up") {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = form.querySelector('input[autocomplete="name"]')?.value.trim();
    const email = form.querySelector('input[type="email"]')?.value.trim();
    const password = form.querySelector("#password")?.value;
    const button = form.querySelector('button[type="submit"], .btn');
    const originalHTML = button?.innerHTML || "Create account";
    if (!name || !email || !password) {
      showMessage("Please fill in your name, email, and password.", true);
      return;
    }
    setLoading(button, true, originalHTML);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      await setDoc(doc(db, "users", credential.user.uid), { uid: credential.user.uid, email: credential.user.email || email, displayName: name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      try {
        await sendEmailVerification(credential.user);
      } catch (verificationError) {
        // The account already exists; keep the user on this page and explain the next step.
        await signOut(auth);
        const passwordField = form.querySelector("#password");
        if (passwordField) passwordField.value = "";
        showMessage(
          "Your account was created, but Firebase could not send the verification email right now. Try signing in later or use the password reset / support options.",
          true
        );
        return;
      }
      await signOut(auth);
      const passwordField = form.querySelector("#password");
      if (passwordField) passwordField.value = "";
      showMessage("Account created successfully! A verification link has been sent to your email. Check your inbox and spam folder, then sign in.");
    } catch (error) {
      showMessage(readableError(error), true);
    } finally {
      setLoading(button, false, originalHTML);
    }
  });
}

if (form && page === "sign-in") {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const email = form.querySelector('input[type="email"]')?.value.trim();
    const password = form.querySelector("#password")?.value;
    const button = form.querySelector('button[type="submit"]') || form.querySelector(".btn");
    const originalHTML = button?.innerHTML || "Sign in";
    if (!email || !password) {
      showMessage("Please enter your email and password.", true);
      return;
    }
    setLoading(button, true, originalHTML);
    try {
      // Explicit local persistence keeps the session available on the dashboard page.
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithEmailAndPassword(auth, email, password);
      if (!credential.user.emailVerified) {
        await signOut(auth);
        showMessage("Your email is not verified yet. Open the verification link sent to your email, then sign in again.", true);
        return;
      }
      await credential.user.getIdToken(true);
      showMessage("Sign-in successful. Opening your dashboard…");
      window.location.assign(new URL("dashboard.html", window.location.href).href);
    } catch (error) {
      showMessage(readableError(error), true);
    } finally {
      setLoading(button, false, originalHTML);
    }
  });
}

if (form && page === "reset-password") {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.querySelector('input[type="email"]')?.value.trim();
    const button = form.querySelector('button[type="submit"], .btn');
    const originalHTML = button?.innerHTML || "Send reset instructions";
    if (!email) return showMessage("Enter your account email address.", true);
    setLoading(button, true, originalHTML);
    try {
      await sendPasswordResetEmail(auth, email);
      showMessage("If an account exists for that email, Firebase has sent a password-reset email. Check your inbox and spam folder.");
    } catch (error) {
      showMessage(readableError(error), true);
    } finally {
      setLoading(button, false, originalHTML);
    }
  });
}

if (googleButton && (page === "sign-in" || page === "sign-up")) {
  googleButton.type = "button";
  googleButton.addEventListener("click", async (event) => {
    event.preventDefault();
    const originalHTML = googleButton.innerHTML;
    setLoading(googleButton, true, originalHTML);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      await setDoc(doc(db, "users", result.user.uid), { uid: result.user.uid, email: result.user.email || "", displayName: result.user.displayName || "", createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      // Google accounts are normally verified by Google; no separate email link is needed.
      if (!result.user.emailVerified) {
        showMessage("Google returned an unverified email. Please try a verified Google account.", true);
        await signOut(auth);
        return;
      }
      await result.user.getIdToken(true);
      showMessage("Google sign-in successful. Opening your dashboard…");
      window.location.assign(new URL("dashboard.html", window.location.href).href);
    } catch (error) {
      showMessage(readableError(error), true);
    } finally {
      setLoading(googleButton, false, originalHTML);
    }
  });
}

if (page === "sign-in" && new URLSearchParams(window.location.search).has("created")) {
  showMessage("Account created! Check your email for the verification link before signing in.");
}

// Protected member dashboard. This prevents unauthenticated visitors from seeing it.
if (page === "dashboard") {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("sign-in.html?required=1");
      return;
    }
    if (!user.emailVerified) {
      await signOut(auth);
      window.location.replace("sign-in.html?verify=1");
      return;
    }
    const initialSource = (user.displayName || user.email || "A").trim();
    document.querySelectorAll(".avatar").forEach((avatar) => {
      avatar.textContent = initialSource.charAt(0).toUpperCase();
      avatar.setAttribute("aria-label", `${initialSource}'s profile`);
      avatar.setAttribute("title", user.displayName || user.email || "Profile");
    });
    const heading = document.querySelector(".page-hero h1");
    if (heading && user.displayName) {
      heading.innerHTML = `Welcome,<br><em>${escapeHTML(user.displayName)}.</em>`;
    }
    // Reveal the admin shortcut only if this signed-in account is on the allowlist.
    try {
      if (await isAuthorizedAdmin(user)) {
        const sideNav = document.querySelector(".side-nav");
        if (sideNav && !sideNav.querySelector('[data-admin-shortcut]')) {
          const adminLink = document.createElement("a");
          adminLink.href = "admin.html";
          adminLink.dataset.adminShortcut = "true";
          adminLink.innerHTML = "<span>✦</span>Admin panel";
          sideNav.append(adminLink);
        }
      }
    } catch (error) {
      console.warn("Could not check admin shortcut:", error);
    }
  });
}

// Admin access: either a trusted custom claim, or an owner-created Firestore
// allowlist document at admins/<lowercase-email>. Clients cannot write this document.
async function isAuthorizedAdmin(user) {
  // This project is configured for one owner account only.
  const ownerEmail = "alirazaxbangash@gmail.com";
  if (!user?.email || user.email.trim().toLowerCase() !== ownerEmail || !user.emailVerified) return false;
  const token = await user.getIdTokenResult(true);
  if (token.claims.admin === true) return true;
  const adminDoc = await getDoc(doc(db, "admins", ownerEmail));
  return adminDoc.exists() && String(adminDoc.data()?.email || "").trim().toLowerCase() === ownerEmail;
}

if (page === "admin") {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("sign-in.html?required=1");
      return;
    }
    try {
      if (!(await isAuthorizedAdmin(user))) {
        const adminContainer = document.querySelector("#admin-content");
        if (adminContainer) adminContainer.innerHTML = `<div class="content-panel"><h1>Admin access required</h1><p>This account has not been granted administrator access. Check the secure Firestore rules and admins allowlist.</p><a class="btn" href="dashboard.html">Return to dashboard</a></div>`;
        return;
      }
      document.querySelectorAll('.admin-profile b').forEach(el => el.textContent = user.displayName || user.email || 'Nexora Admin');
      document.querySelectorAll('.admin-profile small').forEach(el => el.textContent = user.email || 'Administrator');
      document.querySelectorAll('.admin-user-avatar, .admin-top-avatar').forEach(el => el.textContent = (user.displayName || user.email || 'A').trim().charAt(0).toUpperCase());
    } catch (error) {
      console.error('Admin access check failed:', error);
      const adminContainer = document.querySelector("#admin-content");
      if (adminContainer) adminContainer.innerHTML = `<div class="content-panel"><h1>Could not verify admin access</h1><p>Check your internet connection and publish the secure Firestore rules from firestore.rules.</p><a class="btn" href="sign-in.html">Sign in</a></div>`;
    }
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
