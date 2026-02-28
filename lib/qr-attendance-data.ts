export const classOptions = [
  { value: "cse-a", label: "CSE - A" },
  { value: "cse-b", label: "CSE - B" },
]

export const subjectOptions = [
  { value: "ds", label: "Data Structures" },
  { value: "os", label: "Operating Systems" },
  { value: "dbms", label: "DBMS" },
  { value: "cn", label: "Computer Networks" },
  { value: "se", label: "Software Engineering" },
]

export const periodOptions = [
  { value: "1", label: "1st Period  09:15 - 10:10" },
  { value: "2", label: "2nd Period  10:10 - 11:00" },
  { value: "3", label: "3rd Period  11:10 - 12:00" },
  { value: "4", label: "4th Period  12:00 - 12:50" },
  { value: "5", label: "5th Period  01:30 - 02:20" },
]

export type StudentStatus = "present" | "failed" | "pending"

export interface Student {
  id: string
  name: string
  roll: string
  initials: string
  status: StudentStatus
  time?: string
}

export const demoStudents: Student[] = [
  { id: "1", name: "Aarav Reddy", roll: "21CSE101", initials: "AR", status: "present", time: "09:16" },
  { id: "2", name: "Bhavya Sharma", roll: "21CSE102", initials: "BS", status: "present", time: "09:17" },
  { id: "3", name: "Charan Kumar", roll: "21CSE103", initials: "CK", status: "present", time: "09:16" },
  { id: "4", name: "Divya Patel", roll: "21CSE104", initials: "DP", status: "present", time: "09:18" },
  { id: "5", name: "Esha Singh", roll: "21CSE105", initials: "ES", status: "present", time: "09:17" },
  { id: "6", name: "Farhan Ali", roll: "21CSE106", initials: "FA", status: "failed", time: "09:19" },
  { id: "7", name: "Gayathri Nair", roll: "21CSE107", initials: "GN", status: "failed", time: "09:20" },
  { id: "8", name: "Harish Verma", roll: "21CSE108", initials: "HV", status: "pending" },
  { id: "9", name: "Ishita Rao", roll: "21CSE109", initials: "IR", status: "pending" },
  { id: "10", name: "Jayesh Gupta", roll: "21CSE110", initials: "JG", status: "pending" },
  { id: "11", name: "Kavya Desai", roll: "21CSE111", initials: "KD", status: "pending" },
  { id: "12", name: "Lakshman Yadav", roll: "21CSE112", initials: "LY", status: "pending" },
  { id: "13", name: "Meena Joshi", roll: "21CSE113", initials: "MJ", status: "pending" },
  { id: "14", name: "Naveen Prasad", roll: "21CSE114", initials: "NP", status: "pending" },
  { id: "15", name: "Omkar Shetty", roll: "21CSE115", initials: "OS", status: "pending" },
  { id: "16", name: "Priya Menon", roll: "21CSE116", initials: "PM", status: "pending" },
  { id: "17", name: "Rahul Saxena", roll: "21CSE117", initials: "RS", status: "pending" },
  { id: "18", name: "Sneha Kulkarni", roll: "21CSE118", initials: "SK", status: "pending" },
  { id: "19", name: "Tarun Bhat", roll: "21CSE119", initials: "TB", status: "pending" },
  { id: "20", name: "Uma Shankar", roll: "21CSE120", initials: "US", status: "pending" },
  { id: "21", name: "Vijay Anand", roll: "21CSE121", initials: "VA", status: "pending" },
  { id: "22", name: "Waseem Khan", roll: "21CSE122", initials: "WK", status: "pending" },
  { id: "23", name: "Yamini Rao", roll: "21CSE123", initials: "YR", status: "pending" },
  { id: "24", name: "Zoya Sheikh", roll: "21CSE124", initials: "ZS", status: "pending" },
  { id: "25", name: "Ajay Mishra", roll: "21CSE125", initials: "AM", status: "pending" },
  { id: "26", name: "Bala Krishna", roll: "21CSE126", initials: "BK", status: "pending" },
  { id: "27", name: "Chirag Mehta", roll: "21CSE127", initials: "CM", status: "pending" },
  { id: "28", name: "Diya Fernandes", roll: "21CSE128", initials: "DF", status: "pending" },
  { id: "29", name: "Eshwar Reddy", roll: "21CSE129", initials: "ER", status: "pending" },
  { id: "30", name: "Fatima Begum", roll: "21CSE130", initials: "FB", status: "pending" },
  { id: "31", name: "Ganesh Pillai", roll: "21CSE131", initials: "GP", status: "pending" },
  { id: "32", name: "Hema Latha", roll: "21CSE132", initials: "HL", status: "pending" },
  { id: "33", name: "Indira Sethi", roll: "21CSE133", initials: "IS", status: "pending" },
  { id: "34", name: "Jagan Mohan", roll: "21CSE134", initials: "JM", status: "pending" },
  { id: "35", name: "Kiran Teja", roll: "21CSE135", initials: "KT", status: "pending" },
  { id: "36", name: "Laxmi Devi", roll: "21CSE136", initials: "LD", status: "pending" },
  { id: "37", name: "Manoj Varma", roll: "21CSE137", initials: "MV", status: "pending" },
  { id: "38", name: "Nandini Iyer", roll: "21CSE138", initials: "NI", status: "pending" },
  { id: "39", name: "Om Prakash", roll: "21CSE139", initials: "OP", status: "pending" },
  { id: "40", name: "Pooja Hegde", roll: "21CSE140", initials: "PH", status: "pending" },
  { id: "41", name: "Raghu Nandan", roll: "21CSE141", initials: "RN", status: "pending" },
  { id: "42", name: "Santhosh Kumar", roll: "21CSE142", initials: "SK", status: "pending" },
  { id: "43", name: "Tejaswi Reddy", roll: "21CSE143", initials: "TR", status: "pending" },
  { id: "44", name: "Uday Kiran", roll: "21CSE144", initials: "UK", status: "pending" },
  { id: "45", name: "Varun Dhawan", roll: "21CSE145", initials: "VD", status: "pending" },
  { id: "46", name: "Xavier Francis", roll: "21CSE146", initials: "XF", status: "pending" },
  { id: "47", name: "Yashwanth Rao", roll: "21CSE147", initials: "YR", status: "pending" },
]

export const recentSessions = [
  { subject: "Data Structures", class: "CSE-A", period: "1st", date: "2025-02-24", present: 43, total: 47, status: "Finalized" },
  { subject: "Operating Systems", class: "CSE-B", period: "3rd", date: "2025-02-24", present: 39, total: 45, status: "Finalized" },
  { subject: "DBMS", class: "CSE-A", period: "5th", date: "2025-02-23", present: 41, total: 47, status: "Finalized" },
]
