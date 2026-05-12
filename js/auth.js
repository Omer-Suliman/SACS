// auth.js
// ============================================================
// AUTHENTICATION
// ============================================================

async function login(usernameInput, password) {
    const username = usernameInput.trim().toLowerCase();

    // Send plain password to the backend — bcrypt.compare() lives there now.
    // We no longer SHA-256 hash on the frontend; that caused the mismatch with
    // bcrypt-seeded accounts.
    const result = await db.loginUser(username, password);
    if (!result) return null;
    if (result.status !== "ACTIVE") throw new Error(`Account is ${result.status}.`);

    await db.setCurrentUser(result);
    if (result.role === 'STUDENT') {
        await db.ensureWallet(result.email);
    }
    return result;
}

async function signup(name, email, password) {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) throw new Error("Name and email required.");

    const existing = await db.getUserByEmail(trimmedEmail);
    if (existing) throw new Error("Email exists.");

    // Send plain password — the backend /register route hashes it with bcrypt
    const newUser = {
        name: trimmedName,
        email: trimmedEmail,
        role: 'STUDENT',
        status: 'ACTIVE',
        password  // plain text, bcrypt happens on the server
    };
    const added = await db.addUser(newUser);
    await db.setCurrentUser(added);
    if (added.role === 'STUDENT') {
        await db.ensureWallet(added.email);
    }
    return added;
}

async function resetPassword(email) {
    const trimmedEmail = email.trim().toLowerCase();
    const user = await db.getUserByEmail(trimmedEmail);
    if (!user) throw new Error("No account found.");
    await db.updateUser(user.id, { hashedPassword: DEFAULT_PASSWORD_HASH });
    return "Password reset to 123.";
}

async function logout() {
    currentClubId = null;
    await db.clearCurrentUser();
    location.reload();
}
