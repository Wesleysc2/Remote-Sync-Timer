import { Switch, Route, Router as WouterRouter } from "wouter";
import DisplayPage from "@/pages/DisplayPage";
import AdminPage from "@/pages/AdminPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={DisplayPage} />
      <Route path="/admin" component={AdminPage} />
    </Switch>
  );
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}
