"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem("email") as HTMLInputElement).value
    const password = (form.elements.namedItem("password") as HTMLInputElement).value

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-card flex-center-center flex-column">
        <Image src="/DE-Tall-Logo.png" height="400" width="400" alt="Design Elixir Logo" style={{width: 'auto', maxHeight: '200px', marginBottom: '15px'}}/>
        <h1 className="login-title">Design Elixir Admin</h1>
        <p>This page is not intended for public use.</p>
        <div className="flex-start-start flex-column">
        <input name="email" type="email" placeholder="Email" required className="login-input" />
        <input name="password" type="password" placeholder="Password" required className="login-input" />
        {error && <p className="login-error">{error}</p>}
        <button type="submit" disabled={loading} className="login-button full-width" style={{backgroundColor: 'var(--blue)'}}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        </div>
      </form>
    </div>
  )
}