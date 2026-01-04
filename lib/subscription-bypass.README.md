# Subscription Bypass Utility

Esta utilidad permite bypasear las validaciones de suscripción de Stripe para desarrollo y testing.

## Configuración

1. Agrega tu email a la variable de entorno `SUBSCRIPTION_BYPASS_EMAILS` en tu archivo `.env`:

```bash
SUBSCRIPTION_BYPASS_EMAILS=balthasardeweert@gmail.com
```

Para múltiples emails, sepáralos por comas:

```bash
SUBSCRIPTION_BYPASS_EMAILS=dev1@example.com,dev2@example.com,admin@example.com
```

2. Reinicia tu servidor de desarrollo para aplicar los cambios.

## Uso

### Ejemplo 1: Verificar si un usuario está bypaseado

```typescript
import { isSubscriptionBypassed, canAccessPaidFeatures } from '@/lib/subscription-bypass';
import { auth } from '@/auth';

export default async function ProtectedPage() {
  const session = await auth();
  const userEmail = session?.user?.email;

  // Verificar si el usuario está bypaseado
  if (isSubscriptionBypassed(userEmail)) {
    console.log('Usuario bypaseado - acceso completo concedido');
  }

  // Verificar si puede acceder a funciones de pago
  const hasAccess = canAccessPaidFeatures(
    userEmail,
    false // hasActiveSubscription de Stripe
  );

  if (!hasAccess) {
    return <div>Necesitas una suscripción activa</div>;
  }

  return <div>Contenido premium aquí</div>;
}
```

### Ejemplo 2: Middleware o protección de rutas

```typescript
import { isSubscriptionBypassed } from '@/lib/subscription-bypass';

async function checkSubscriptionAccess(email: string) {
  // Si está bypaseado, dar acceso inmediato
  if (isSubscriptionBypassed(email)) {
    return true;
  }

  // De lo contrario, verificar suscripción real con Stripe
  const hasActiveSubscription = await checkStripeSubscription(email);
  return hasActiveSubscription;
}
```

### Ejemplo 3: Mostrar información de bypass (debugging)

```typescript
import { getBypassInfo } from '@/lib/subscription-bypass';

const bypassInfo = getBypassInfo(userEmail);
console.log(bypassInfo);
// {
//   bypassed: true,
//   reason: 'Email in SUBSCRIPTION_BYPASS_EMAILS',
//   email: 'balthasardeweert@gmail.com'
// }
```

### Ejemplo 4: Server Component con bypass

```typescript
import { auth } from '@/auth';
import { canAccessPaidFeatures } from '@/lib/subscription-bypass';
import { checkStripeSubscription } from '@/lib/stripe-utils'; // tu función

export default async function PremiumFeature() {
  const session = await auth();
  const email = session?.user?.email;

  // Verificar si tiene suscripción activa en Stripe
  const hasStripeSubscription = await checkStripeSubscription(email);

  // canAccessPaidFeatures retorna true si está bypaseado O tiene suscripción
  const hasAccess = canAccessPaidFeatures(email, hasStripeSubscription);

  if (!hasAccess) {
    return (
      <div>
        <h1>Acceso Denegado</h1>
        <p>Necesitas una suscripción activa para acceder a esta función</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Función Premium</h1>
      {/* Tu contenido premium aquí */}
    </div>
  );
}
```

## API Reference

### `isSubscriptionBypassed(email: string | null | undefined): boolean`

Verifica si un email está en la lista de bypass.

**Parámetros:**
- `email`: El email del usuario a verificar

**Retorna:** `true` si el email está en la lista de bypass, `false` de lo contrario

---

### `canAccessPaidFeatures(email: string | null | undefined, hasActiveSubscription: boolean): boolean`

Verifica si un usuario puede acceder a funciones de pago (ya sea por bypass o suscripción activa).

**Parámetros:**
- `email`: El email del usuario
- `hasActiveSubscription`: Si el usuario tiene una suscripción activa en Stripe (default: `false`)

**Retorna:** `true` si el usuario debe tener acceso

---

### `getBypassInfo(email: string | null | undefined): object`

Obtiene información detallada sobre el estado de bypass para debugging.

**Parámetros:**
- `email`: El email del usuario

**Retorna:** Un objeto con:
```typescript
{
  bypassed: boolean;
  reason: string;
  email: string;
}
```

## Seguridad

⚠️ **IMPORTANTE**: Esta función es SOLO para desarrollo y testing.

**Mejores prácticas:**

1. ✅ Usar solo en entornos de desarrollo local
2. ✅ Nunca committear `.env` con emails reales
3. ✅ Remover `SUBSCRIPTION_BYPASS_EMAILS` en producción
4. ✅ Usar emails de desarrollo/testing únicamente
5. ❌ NUNCA usar en producción con emails reales de clientes

## Notas

- Los emails se comparan en minúsculas (case-insensitive)
- Los espacios alrededor de los emails se eliminan automáticamente
- Si `SUBSCRIPTION_BYPASS_EMAILS` no está definido, nadie será bypaseado
- La función es segura con `null` o `undefined` - simplemente retorna `false`
