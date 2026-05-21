import { auth, signIn } from "@/auth"
import { redirect } from "next/navigation"
import Navigation from "./components/Navigation";
import Tabs from "./components/Tabs";
import CompletedTasksList from "./projects/CompletedTasks";
import Tasks from "./projects/TaskList";

export default async function AdminPage() {
  const session = await auth()
  
  if (!session) {
    return (
      <main>
        <h1>Admin</h1>
        <form action={async () => {
          "use server"
          await signIn("github")
        }}>
          <button type="submit">Sign in with GitHub</button>
        </form>
      </main>
    )
  }

  return (
    <div className="flex-center-center full-width basic-padding">
      <Tabs 
        tabs={[ 
          { name: "Overview", content: <Tasks tableTitle="All Tasks" /> },
          { name: "Completed", content: <CompletedTasksList></CompletedTasksList> }
        ]} 
      />
    </div>
  )
}