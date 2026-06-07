interface WebsiteLayoutProps {
  children: React.ReactNode;
}

export default function WebsiteLayout({ children }: WebsiteLayoutProps) {
  return <div className="p-4 h-full flex flex-col">{children}</div>;
}
