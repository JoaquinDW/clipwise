import Image from "next/image"
import Logo from "../(landing-page)/public/images/logo.svg"
import Link from "next/link"

export default function AcmeLogo() {
  return (
    <Link href="/">
      <div className={"flex flex-row items-center leading-none text-white"}>
        <Image
          src={Logo}
          alt="Clipwise Logo"
          width={56}
          height={56}
          className="h-14 w-14 rounded-2xl object-contain"
          priority
        />
        <p className="text-[20px] text-black font-bold tracking-tight	pl-2">
          Clipwise
        </p>
      </div>
    </Link>
  )
}
