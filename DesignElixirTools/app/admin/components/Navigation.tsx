"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem } from "../types/globalTypes";

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: "/DE-Lil-Guy.svg", section: 'Design Elixir' },
  { title: "CSS Formatter", href: "/admin/css-formatter", icon: "/css.png", section: 'Tools' },
  { title: "Paragraph Cleaner", href: "/admin/paragraph-cleaner", icon: "/paragraph.svg", section: 'Tools' },
  { title: "QR Code Generator", href: "/admin/qr-code-generator", icon: "/qr-code.svg", section: 'Tools'},
  { title: "Client List", href: "/admin/client-list", icon: "/rating.png", section: "Design Elixir"},
  { title: "Time Tracker", href: "/admin/time-tracking", icon: "/clock.png", section: "Design Elixir"},
  {title: "Project List", href: "/admin/projects", icon: "/pencil-case.png", section: "Design Elixir"},
  {title: "Invoices", href: '/admin/invoices', icon: "/coin.png", section: "Design Elixir"},
  { title: "Mixpanel", href: "/admin/mixpanel", icon: "/qr-code.svg", section: 'Tools'},
];



export default function Navigation() {
  const pathname = usePathname();
  // Group items by section
  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  // Define the order of sections
  const sectionOrder = ["Design Elixir", "Tools"];

  return (
    <nav className="nav-grid-wrapper flex-start-start flex-column">
      {sectionOrder.map((section) => {
        const items = groupedItems[section];
        if (!items) return null;
        
        return (
          <div key={section} className="nav-section">
            <h3 className="no-text-spacing white-text">{section}</h3>
            <div className="nav-grid-link-wrapper">
            {items.map((item, idx) => {
              const isActive = pathname === item.href;
              return (
                <div key={idx} className="grid-link flex-center-center">
                  <Link href={item.href} className={`nav-link no-link-styling flex-center-start full-width ${isActive ? 'active-link' : ''}`} >
                    <div className="icon-bg" style={{backgroundImage: 'url(' + item.icon + ')'}}></div>
                    <p className="centered-text no-text-spacing">{item.title}</p>
                  </Link>
                </div>
              );
            })}
            </div>
          </div>
            
        );
      })}
    </nav>
  );
}