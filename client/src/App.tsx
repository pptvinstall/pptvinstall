import { Route, Switch } from "wouter";
import HomePage from "@/pages/index";
import BookingConfirmation from "@/pages/BookingConfirmation";
import AdminCalendar from "@/pages/AdminCalendar";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/confirmation" component={BookingConfirmation} />
      <Route path="/admin/calendar" component={AdminCalendar} />
      <Route>404 - Page Not Found</Route>
    </Switch>
  );
}