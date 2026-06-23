import Supabase
import Foundation

let supabaseProjectURL = URL(string: "https://azsabfxrgurnslimtudh.supabase.co")!

// Shared Supabase client — initialised once, used everywhere
let supabase = SupabaseClient(
    supabaseURL: supabaseProjectURL,
    supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6c2FiZnhyZ3VybnNsaW10dWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODIyODksImV4cCI6MjA5MTI1ODI4OX0.0UUeTAn7oLVICrzXd7PyLPIo6lr1hmYTFb7d3LtajzE"
)
