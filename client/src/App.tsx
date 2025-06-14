import { Route, Switch } from "wouter";
import HomePage from "@/pages/HomePage";
import BookingPage from "@/pages/BookingPage";
import BookingConfirmation from "@/pages/BookingConfirmation";
import EnhancedAdminCalendar from "@/pages/EnhancedAdminCalendar";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/booking" component={BookingPage} />
      <Route path="/confirmation" component={BookingConfirmation} />
      <Route path="/admin/calendar" component={EnhancedAdminCalendar} />
      <Route>404 - Page Not Found</Route>
    </Switch>
  );
}