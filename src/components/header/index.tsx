import { useContext } from "react";
import { UserContext } from "@src/context/info";

export default function Header() {
  const { siteName } = useContext(UserContext);

  return (
    <header className="w-full p-4 px-8 bg-gray-100 shadow-md ">
      <h1 className="text-2xl font-bold text-center">{siteName}</h1>
    </header>
  );
}
