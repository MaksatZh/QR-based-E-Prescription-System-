import { createBrowserRouter } from "react-router";
import Login from "./components/Login";
import DashboardLayout from "./components/DashboardLayout";
import DoctorPortal from "./components/DoctorPortal";
import PharmacistPortal from "./components/PharmacistPortal";
import AdminPortal from "./components/AdminPortal";
import PatientView from "./components/PatientView";
import PrescriptionDetails from "./components/PrescriptionDetails";
import CreatePrescription from "./components/CreatePrescription";
import EditPrescription from "./components/EditPrescription";
import Profile from "./components/Profile";
import ActivateAccount from "./components/ActivateAccount";
import RecentActivity from "./components/RecentActivity";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/forgot-password",
    Component: ForgotPassword,
  },
  {
    path: "/reset-password/:token",
    Component: ResetPassword,
  },
  {
    path: "/activate/:token",
    Component: ActivateAccount,
  },
  {
    path: "/patient/:prescriptionId",
    Component: PatientView,
  },
  {
    path: "/dashboard",
    Component: DashboardLayout,
    children: [
      {
        path: "doctor",
        Component: DoctorPortal,
      },
      {
        path: "doctor/create",
        Component: CreatePrescription,
      },
      {
        path: "doctor/edit/:id",
        Component: EditPrescription,
      },
      {
        path: "doctor/prescription/:id",
        Component: PrescriptionDetails,
      },
      {
        path: "pharmacist",
        Component: PharmacistPortal,
      },
      {
        path: "admin",
        Component: AdminPortal,
      },
      {
        path: "profile",
        Component: Profile,
      },
      {
        path: "activity",
        Component: RecentActivity,
      },
    ],
  },
]);
