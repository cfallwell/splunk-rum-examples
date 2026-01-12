import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const RumRouterTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname + location.search;

    if (window.SplunkRum?.navigate) {
      window.SplunkRum.navigate(path);
    } else if (window.SplunkRum?.addRumEvent) {
      window.SplunkRum.addRumEvent("route-change", { path });
    } else {
      console.debug("[RumRouterTracker] Route changed:", path);
    }
  }, [location]);

  return null;
};
