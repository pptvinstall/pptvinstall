import { Route, Switch } from "wouter";
import HomePage from "@/pages/index";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route>404 - Page Not Found</Route>
    </Switch>
  );
}