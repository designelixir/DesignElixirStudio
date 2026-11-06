"use client";

import { useState, MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem } from "@/types/globalTypes";

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: "/DE-Lil-Guy.svg", section: 'Design Elixir' },
  { title: "CSS Formatter", href: "/css-formatter", icon: "/css.png", section: 'Tools' },
  { title: "Paragraph Cleaner", href: "/paragraph-cleaner", icon: "/paragraph.svg", section: 'Tools' },
  { title: "QR Code Generator", href: "/qr-code-generator", icon: "/qr-code.svg", section: 'Tools'},
  { title: "Client List", href: "/client-list", icon: "/rating.png", section: "Design Elixir"},
  { title: "Time Tracker", href: "/time-tracking", icon: "/clock.png", section: "Design Elixir"},
  {title: "Project List", href: "/projects", icon: "/pencil-case.png", section: "Design Elixir"},
  {title: "Invoices", href: '/invoices', icon: "/coin.png", section: "Design Elixir"},
  { title: "Mixpanel", href: "/mixpanel", icon: "/mixpanel.svg", section: 'Tools'},
  {
    title: "Books",
    href: "/books",
    icon: "/books.svg",
    section: "Design Elixir",
    children: [
      { title: "Accounts", href: "/books/accounts" },
      { title: "Transactions", href: "/books/transactions" },
      { title: "Statements", href: "/books/statements" },
      { title: "Expenses", href: "/books/expenses" },
      { title: "Expense Categories", href: "/books/categories" },
    ],
  },
];

// On this page or one under it (e.g. /books/accounts/123 is under /books/accounts)
const isWithin = (pathname: string, href: string) =>
  pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

export default function Navigation() {
  const pathname = usePathname();
  // Folders opened by clicking. A folder is also open while you're on one of its pages.
  const [openedFolders, setOpenedFolders] = useState<Set<string>>(new Set());

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
              const hasChildren = !!item.children?.length;
              const isOpen = hasChildren && (openedFolders.has(item.href) || isWithin(pathname, item.href));
              // A folder is highlighted only on its own page; its sub-links highlight themselves
              const isActive = pathname === item.href;

              // First click on a closed folder just opens it; clicking it while open
              // follows the link (e.g. to /books)
              const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
                if (!hasChildren || isOpen) return;
                e.preventDefault();
                setOpenedFolders((prev) => new Set(prev).add(item.href));
              };

              return (
                <div key={idx} className={`grid-link ${hasChildren ? 'flex-start-start flex-column' : 'flex-center-center'}`}>
                  <Link
                    href={item.href}
                    onClick={handleClick}
                    aria-expanded={hasChildren ? isOpen : undefined}
                    className={`nav-link no-link-styling flex-center-start full-width ${isActive ? 'active-link' : ''}`}
                  >
                    <div className="icon-bg" style={{backgroundImage: 'url(' + item.icon + ')'}}></div>
                    <p className="centered-text no-text-spacing">{item.title}</p>
                    {hasChildren && (
                      <span className={`nav-folder-caret ${isOpen ? 'nav-folder-caret-open' : ''}`} aria-hidden>▸</span>
                    )}
                  </Link>

                  {hasChildren && (
                    <div className={`nav-subnav ${isOpen ? 'nav-subnav-open' : ''}`}>
                      <div className="nav-subnav-inner">
                        {item.children!.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            // Closed links stay out of the tab order
                            tabIndex={isOpen ? undefined : -1}
                            className={`nav-sublink no-link-styling ${isWithin(pathname, child.href) ? 'nav-sublink-active' : ''}`}
                          >
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
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
