import React from 'react';
import { Button } from '@chakra-ui/react'; // Assuming Chakra UI
import Link from 'next/link'; // Or react-router-dom's Link
import { ChevronLeft } from '@chakra-ui/icons'; // Or other icon library

function BookingConfirmation() {
  return (
    <div>
      {/* ... other booking confirmation content ... */}
      <Button variant="outline" className="inline-flex items-center" as="a"> {/* Using 'as' prop to avoid nesting */}
        <Link href="/"><a> {/* Wrapping in <a> is not strictly necessary if using Next.js' Link correctly */}
          <ChevronLeft className="mr-2 h-4 w-4" />
          Return to Homepage
        </a></Link>
      </Button>
      {/* ... rest of the booking confirmation content ... */}
    </div>
  );
}

export default BookingConfirmation;