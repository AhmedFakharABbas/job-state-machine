"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [token, setTokenValue] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!token.trim()) {
      setError(true);
      return;
    }
    setError(false);
    setToken(token.trim());
    router.push("/");
  };

  return (
    <main>
      <h1>Operator Login</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="token">API Token</label>
        <input
          id="token"
          type="text"
          data-testid="login-token-input"
          value={token}
          onChange={(e) => setTokenValue(e.target.value)}
        />
        <button type="submit" data-testid="login-submit">
          Login
        </button>
        {error ? <div data-testid="login-error">Token is required</div> : null}
      </form>
    </main>
  );
}
