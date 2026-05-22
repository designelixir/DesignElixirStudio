import { auth } from "@/auth"
import Tabs from "./components/Tabs";
import CompletedTasksList from "./projects/CompletedTasks";
import Tasks from "./projects/TaskList";
import Login from "@/app/components/Login";

export default async function AdminPage() {
  const session = await auth()

  if (!session) {
    return <Login />
  }

  return (
    <div className="flex-center-center full-width basic-padding">
      <Tasks tableTitle="All Tasks" />
    </div>
  )
}