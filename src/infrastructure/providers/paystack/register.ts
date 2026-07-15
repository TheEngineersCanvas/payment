import { registerProvider } from "../provider-factory.js";
import { PaystackAdapter } from "./paystack-adapter.js";
import type { Provider } from "../../../domain/provider/provider.js";

const PAYSTACK_ID: Provider = "paystack" as Provider;

registerProvider(PAYSTACK_ID, (config, deps) => new PaystackAdapter(config, deps));
