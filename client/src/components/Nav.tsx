// ... other imports ...
import Link from 'next/link'; // Assuming Next.js Link component

// ... other code ...

// Assuming this is part of a component rendering navigation links
const navigationLinks = [
  { href: '/home', name: 'Home', icon: HomeIcon },
  { href: '/profile', name: 'Profile', icon: UserIcon },
  // ... more links ...
];


// ... other code ...

{navigationLinks.map((link) => (
  <Link href={link.href} className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
    {link.icon && <link.icon className="w-4 h-4 mr-2" />}
    {link.name}
  </Link>
))}

// ... rest of the component ...