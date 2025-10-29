import Navbar from "@/components/Navbar";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container">
      <Navbar />
      {children}
    </div>
  );
}
