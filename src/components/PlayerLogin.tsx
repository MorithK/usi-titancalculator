
type LoginProps = {
  email: string
  password: string
  error: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onLogin: () => Promise<void>
}

export default function Login({
  email,
  password,
  error,
  onEmailChange,
  onPasswordChange,
  onLogin
}: LoginProps) {
  return (
    <main className="flex min-h-screen items-center justify-center
      bg-[#0B1120] p-4">

      <div className="w-full max-w-md rounded-xl border
        border-slate-800 bg-[#111827] p-8">

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-cyan-400">
            USI TITAN
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Progression Calculator & Planner
          </p>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault()
            void onLogin()
          }}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm text-slate-300"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => onEmailChange(e.target.value)}
              className="w-full rounded-lg border border-slate-700
                bg-slate-900 px-3 py-2 text-white
                focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm text-slate-300"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => onPasswordChange(e.target.value)}
              className="w-full rounded-lg border border-slate-700
                bg-slate-900 px-3 py-2 text-white
                focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-500 px-4 py-3
              font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  )
}
