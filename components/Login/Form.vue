<template>
  <div class="flex flex-col gap-6">
    <SCard class="overflow-hidden">
      <SCardContent class="grid p-0 md:grid-cols-2">
        <form class="p-6 md:p-8" @submit.prevent="login">
          <div class="flex flex-col gap-6">
            <div class="flex flex-col items-center text-center">
              <h1 class="text-2xl font-bold">
                Welcome 
              </h1>
              <p class="text-balance text-muted-foreground">
                Login to start your research 
              </p>
            </div>
            <div class="grid gap-2">
              <SLabel for="email">Email</SLabel>
              <SInput
                v-model="state.email"
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div class="grid gap-2">
              <div class="flex items-center">
                <SLabel for="password">Password</SLabel>
                <NuxtLink
                  to="mailto:ziadomalik@gmail.com"
                  class="ml-auto text-sm underline-offset-2 hover:underline"
                >
                  Forgot your password?
                </NuxtLink>
              </div>
              <SInput id="password" type="password" required v-model="state.password" />
            </div>
            <SButton type="submit" class="w-full" :disabled="loading">
              {{ loading ? 'Logging in...' : 'Login' }}
            </SButton>
            <div class="text-center text-sm">
              Wanna try it out?
              <NuxtLink to="mailto:ziadomalik@gmail.com" class="underline underline-offset-4">
                Let us know!
              </NuxtLink>
            </div>
          </div>
        </form>
        <div class="relative hidden bg-muted md:block">
          <img
            src="#"
            alt="Image"
            class="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          >
        </div>
      </SCardContent>
    </SCard>
    <div class="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        Made with ❤️ by <span class="font-semibold">1%BETTER</span>
    </div>

    <SDialog :open="showErrorDialog" @update:open="showErrorDialog = $event">
      <SDialogContent>
        <SDialogHeader>
          <SDialogTitle class="flex items-center gap-2 text-red-500">
            <Icon class="h-6 w-6" name="i-solar-danger-triangle-bold" />
            Login Failed
          </SDialogTitle>
          <SDialogDescription class="pt-2">{{ error }}</SDialogDescription>
        </SDialogHeader>
        <SDialogFooter>
          <SButton variant="destructive" @click="showErrorDialog = false">Close</SButton>
        </SDialogFooter>
      </SDialogContent>
    </SDialog>

    <SDialog :open="showSuccessDialog" @update:open="showSuccessDialog = $event">
      <SDialogContent>
        <SDialogHeader>
          <SDialogTitle class="flex items-center gap-2 text-green-500">
            <Icon class="h-6 w-6" name="i-solar-check-circle-bold-duotone" />
            Login Successful
          </SDialogTitle>
          <SDialogDescription class="pt-2">
            Welcome back! Redirecting you to your dashboard...
          </SDialogDescription>
        </SDialogHeader>
        <div class="mt-4 flex justify-center">
          <div class="h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-500"></div>
        </div>
      </SDialogContent>
    </SDialog>
  </div>
</template>


<script setup lang="ts">
const supabase = useSupabaseClient()
const router = useRouter()

const state = reactive({
  email: '',
  password: '',
})

const loading = ref(false)
const error = ref('')
const showErrorDialog = ref(false)
const showSuccessDialog = ref(false)

const login = async () => {
  if (!state.email || !state.password) {
    error.value = 'Please enter both email and password'
    showErrorDialog.value = true
    return
  }

  try {
    loading.value = true
    const { data, error: authError } = await supabase.auth.signInWithPassword({ 
      email: state.email, 
      password: state.password 
    })
    
    if (authError) {
      error.value = authError.message
      showErrorDialog.value = true
      return
    }
    
    showSuccessDialog.value = true
    setTimeout(() => {
        navigateTo('/')
    }, 1500)
  } catch (err: any) {
    error.value = err.message || 'An unexpected error occurred'
    showErrorDialog.value = true
  } finally {
    loading.value = false
  }
}
</script>
