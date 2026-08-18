"use client"

import { useState } from "react"

export default function UserAvatar({
  image,
  initial,
  name,
}: {
  image?: string | null
  initial: string
  name?: string | null
}) {
  // Google avatar URLs 403 when a Referer is sent, and they expire; either way
  // the <img> renders as a broken-image icon, so fall back to the initial.
  const [failed, setFailed] = useState(false)

  if (!image || failed) {
    return (
      <span
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #FF3B5C, #FF8C00)' }}
        aria-hidden="true"
      >
        {initial}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt={name || ""}
      width={32}
      height={32}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-8 w-8 flex-none rounded-full object-cover"
    />
  )
}
