"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, MoreHorizontal, Pencil, KeyRound, ShieldOff } from "lucide-react"

interface Teacher {
  id: string
  name: string
  initials: string
  teacherId: string
  department: string
  subjects: number
  status: "Active" | "Disabled"
}

const initialTeachers: Teacher[] = [
  { id: "1", name: "Dr. P. Sharma", initials: "PS", teacherId: "TCH001", department: "CSE", subjects: 3, status: "Active" },
  { id: "2", name: "Dr. S. Reddy", initials: "SR", teacherId: "TCH002", department: "CSE", subjects: 2, status: "Active" },
  { id: "3", name: "Dr. M. Patel", initials: "MP", teacherId: "TCH003", department: "ECE", subjects: 1, status: "Active" },
  { id: "4", name: "Dr. K. Rao", initials: "KR", teacherId: "TCH004", department: "CSE", subjects: 2, status: "Active" },
  { id: "5", name: "Dr. A. Singh", initials: "AS", teacherId: "TCH005", department: "ECE", subjects: 1, status: "Disabled" },
]

export default function TeacherManagementPage() {
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<Teacher | null>(null)
  const [disableTarget, setDisableTarget] = useState<Teacher | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formTeacherId, setFormTeacherId] = useState("")
  const [formDept, setFormDept] = useState("")
  const [formEmail, setFormEmail] = useState("")

  function handleAddTeacher() {
    if (!formName || !formTeacherId || !formDept || !formEmail) {
      toast.error("Please fill all fields")
      return
    }
    const initials = formName
      .split(" ")
      .filter((w) => w[0] && w[0] === w[0].toUpperCase())
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
    const newTeacher: Teacher = {
      id: String(Date.now()),
      name: formName,
      initials: initials || "NA",
      teacherId: formTeacherId,
      department: formDept,
      subjects: 0,
      status: "Active",
    }
    setTeachers((prev) => [...prev, newTeacher])
    setSheetOpen(false)
    setFormName("")
    setFormTeacherId("")
    setFormDept("")
    setFormEmail("")
    toast.success(`Teacher "${formName}" added successfully`)
  }

  function handleResetPassword() {
    if (!resetTarget) return
    toast.success(`Password reset for ${resetTarget.name}. They will be forced to change it on next login.`)
    setResetTarget(null)
  }

  function handleDisableAccount() {
    if (!disableTarget) return
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === disableTarget.id
          ? { ...t, status: t.status === "Active" ? "Disabled" : "Active" }
          : t
      )
    )
    const action = disableTarget.status === "Active" ? "disabled" : "enabled"
    toast.success(`${disableTarget.name}'s account has been ${action}.`)
    setDisableTarget(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage teacher accounts and their permissions.
        </p>
        <Button onClick={() => setSheetOpen(true)} className="gap-2">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Teacher</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium text-muted-foreground">Teacher</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Teacher ID</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Department</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground text-center">Subjects</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {t.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">{t.teacherId}</td>
                    <td className="px-5 py-3 text-muted-foreground">{t.department}</td>
                    <td className="px-5 py-3 text-center font-semibold text-foreground">{t.subjects}</td>
                    <td className="px-5 py-3">
                      <Badge variant={t.status === "Active" ? "secondary" : "outline"} className={t.status === "Active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-muted text-muted-foreground"}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Teacher actions">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Pencil className="size-4" />
                            Edit Teacher
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetTarget(t)}>
                            <KeyRound className="size-4" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDisableTarget(t)}
                          >
                            <ShieldOff className="size-4" />
                            {t.status === "Active" ? "Disable Account" : "Enable Account"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {teachers.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{t.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{t.teacherId}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Teacher actions">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="size-4" />
                      Edit Teacher
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setResetTarget(t)}>
                      <KeyRound className="size-4" />
                      Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDisableTarget(t)}
                    >
                      <ShieldOff className="size-4" />
                      {t.status === "Active" ? "Disable Account" : "Enable Account"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">{t.department}</span>
                <span className="text-muted-foreground">{'|'}</span>
                <span className="text-muted-foreground">{t.subjects} subjects</span>
                <Badge variant={t.status === "Active" ? "secondary" : "outline"} className={t.status === "Active" ? "ml-auto bg-emerald-500/10 text-emerald-600 border-emerald-200" : "ml-auto bg-muted text-muted-foreground"}>
                  {t.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Teacher Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Teacher</SheetTitle>
            <SheetDescription>
              Create a new teacher account. A default password will be assigned automatically.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-name">Full Name</Label>
              <Input
                id="teacher-name"
                placeholder="Dr. Full Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-id">Teacher ID</Label>
              <Input
                id="teacher-id"
                placeholder="TCH006"
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-dept">Department</Label>
              <Select value={formDept} onValueChange={setFormDept}>
                <SelectTrigger id="teacher-dept">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSE">CSE</SelectItem>
                  <SelectItem value="ECE">ECE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-email">Email</Label>
              <Input
                id="teacher-email"
                type="email"
                placeholder="teacher@nnrg.edu.in"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="rounded-lg bg-muted/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Default password will be assigned automatically. The teacher will be forced to change it on first login.
              </p>
            </div>
            <Button onClick={handleAddTeacher} className="mt-2">
              Add Teacher
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reset Password Dialog */}
      <AlertDialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Reset password for <span className="font-semibold text-foreground">{resetTarget?.name}</span> to
              default password? Teacher will be forced to change it on next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable Account Dialog */}
      <AlertDialog open={!!disableTarget} onOpenChange={() => setDisableTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {disableTarget?.status === "Active" ? "Disable Account" : "Enable Account"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {disableTarget?.status === "Active" ? (
                <>
                  Are you sure you want to disable <span className="font-semibold text-foreground">{disableTarget?.name}</span>{"'s"} account?
                  They will not be able to log in or conduct attendance sessions until re-enabled.
                </>
              ) : (
                <>
                  Re-enable <span className="font-semibold text-foreground">{disableTarget?.name}</span>{"'s"} account?
                  They will regain access to the system.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableAccount}
              className={disableTarget?.status === "Active" ? "bg-destructive text-white hover:bg-destructive/90" : ""}
            >
              {disableTarget?.status === "Active" ? "Disable" : "Enable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
