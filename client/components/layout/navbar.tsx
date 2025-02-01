import { ThemeToggle } from "../theme/theme-toggle";

export function Navbar() {
  return (
    <nav className="border-b h-14">
      <div className="container mx-auto flex h-full items-center px-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold">CryptoPredict</span>
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
