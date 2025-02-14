import { useContext } from "react";
import { UserContext } from "@src/context/info";

export default function Footer() {
  const { siteName } = useContext(UserContext);
  return (
    <footer className="flex items-center justify-between w-full p-6 px-8 text-gray-600 bg-gray-100 shadow-md">
      <span>&copy; 2025 {siteName}. All rights reserved.</span>
      <div className="flex gap-4">
        <a href="#" className="transition hover:text-black">
          Privacy Policy
        </a>
        <a href="#" className="transition hover:text-black">
          Terms of Service
        </a>
        <a href="#" className="transition hover:text-black">
          Contact
        </a>
      </div>
    </footer>
  );
}
