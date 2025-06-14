import { Route, Switch } from "wouter";
import HomePage from "@/pages/index";
import BookingConfirmation from "@/pages/BookingConfirmation";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/confirmation" component={BookingConfirmation} />
      <Route>404 - Page Not Found</Route>
    </Switch>
  );
}