import Stripe from 'stripe';
import { pool } from '../database.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// POST /webhook/stripe
async function handleStripe(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar el evento
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionChange(event.data.object);
      break;

    default:
      console.log(`Evento no manejado: ${event.type}`);
  }

  res.json({ received: true });
}

// Manejar pago completado
async function handleCheckoutCompleted(session) {
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan;

  if (!userId || !plan) {
    console.error('❌ Metadata faltante en checkout session');
    return;
  }

  try {
    // Calcular nueva fecha de acceso
    let accessUntil;
    
    switch (plan) {
      case 'monthly':
        accessUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'yearly':
        accessUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        break;
      case 'lifetime':
        accessUntil = new Date('2099-12-31T23:59:59Z');
        break;
      default:
        console.error('❌ Plan desconocido:', plan);
        return;
    }

    // Actualizar en DB
    await pool.query(
      `UPDATE user_access 
       SET plan = $1, 
           access_until = $2, 
           stripe_customer_id = $3,
           stripe_subscription_id = $4,
           updated_at = NOW()
       WHERE user_id = $5`,
      [
        plan,
        accessUntil,
        session.customer,
        session.subscription || null,
        userId,
      ]
    );

    console.log(`✅ Acceso actualizado - Usuario: ${userId} | Plan: ${plan}`);

  } catch (err) {
    console.error('❌ Error actualizando acceso:', err);
  }
}

// Manejar cambios en suscripción
async function handleSubscriptionChange(subscription) {
  try {
    const customerId = subscription.customer;
    const status = subscription.status;

    // Si la suscripción se cancela o expira
    if (status === 'canceled' || status === 'unpaid') {
      await pool.query(
        `UPDATE user_access 
         SET access_until = NOW(), 
             updated_at = NOW()
         WHERE stripe_customer_id = $1`,
        [customerId]
      );

      console.log(`⚠️ Suscripción cancelada - Customer: ${customerId}`);
    }

  } catch (err) {
    console.error('❌ Error en handleSubscriptionChange:', err);
  }
}

export { handleStripe };