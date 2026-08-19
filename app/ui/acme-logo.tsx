import Image from "next/image"
import Logo from "../(landing-page)/public/images/logo-horizontal.png"
import Link from "next/link"

export default function AcmeLogo() {
  return (
    <Link href="/" aria-label="Momentreel">
      <Image
        src={Logo}
        alt="Momentreel"
        width={1288}
        height={220}
        className="h-10 w-auto"
        priority
      />
    </Link>
  )
}
