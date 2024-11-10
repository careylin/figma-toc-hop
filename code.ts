const FONT = { family: "Inter", style: "Regular" };
const MEDIUM_FONT = { family: "Inter", style: "Bold" };
const FALLBACK_FONT = { family: "Inter", style: "Regular" };

const FILL_PRIMARY: Paint[] = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
const FILL_SECONDARY: Paint[] = [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }];
const FILL_DIVIDER: Paint[] = [{ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.8 } }];

async function loadFont(): Promise<FontName> {
	try {
		await figma.loadFontAsync(FONT);
		await figma.loadFontAsync(MEDIUM_FONT);
		return FONT;
	} catch {
		return FALLBACK_FONT;
	}
}

function createBaseFrame(name: string): FrameNode {
	const frame = figma.createFrame();
	frame.layoutMode = "VERTICAL";
	frame.primaryAxisSizingMode = "AUTO";
	frame.counterAxisSizingMode = "AUTO";
	frame.name = name;
	return frame;
}

function createDivider(stroke?: Paint): LineNode {
	const divider = figma.createLine();
	divider.strokes = [stroke ?? { type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
	divider.strokeWeight = 1;
	divider.layoutAlign = "STRETCH";
	return divider;
}

function createTextNode(text: string, fontSize: number, font: FontName, fills?: Paint[], linkId?: string): TextNode {
	const node = figma.createText();
	node.fontName = font;
	node.fontSize = fontSize;
	node.characters = text;
	if (fills) {
		node.fills = fills;
	}
	if (linkId) {
		node.hyperlink = { type: "NODE", value: linkId };
	}
	return node;
}

async function generateTableOfContents(onlyGenerateForCurrentPage: boolean = false): Promise<FrameNode> {
	const font = await loadFont();

	// Create main frame
	const tocFrame = createBaseFrame("Table of Contents");
	tocFrame.paddingLeft = tocFrame.paddingRight = 40;
	tocFrame.paddingTop = tocFrame.paddingBottom = 40;
	tocFrame.itemSpacing = 40;
	tocFrame.cornerRadius = 16;

	// Add title and content
	const divider = createDivider();
	tocFrame.appendChild(createTextNode(figma.root.name, 32, MEDIUM_FONT, FILL_PRIMARY));
	tocFrame.appendChild(divider);

	const createPage = async (page: PageNode) => {
		console.log("page.name", page.name);

		let sectionAutoLayout;
		try {
			sectionAutoLayout = await createPageFrames(page);
		} catch (err) {
			console.log("err", err);
		}
		if (sectionAutoLayout) {
			const pageName = createTextNode(page.name, 32, MEDIUM_FONT, FILL_PRIMARY);
			pageName.resizeWithoutConstraints(pageName.width, 48);

			sectionAutoLayout.insertChild(0, pageName);
			tocFrame.appendChild(sectionAutoLayout);

			// Don't add divider after the last page
			if (page !== figma.root.children[figma.root.children.length - 1]) {
				tocFrame.appendChild(createDivider(FILL_DIVIDER[0]));
			}
		}
	};

	if (onlyGenerateForCurrentPage) {
		await createPage(figma.currentPage);
	} else {
		await Promise.all(figma.root.children.map(createPage));
	}

	async function createPageFrames(page: PageNode) {
		// Create hierarchy frame
		const sectionAutoLayout = createBaseFrame("Page");
		// sectionAutoLayout.paddingTop = sectionAutoLayout.paddingBottom = 16;
		sectionAutoLayout.itemSpacing = 16;

		// Add sections
		await page.loadAsync();
		const sections = page.children.filter((node) => node.type === "SECTION") as SectionNode[];

		for (const section of sections) {
			const childSections = section.findChildren((node) => node.type === "SECTION") as SectionNode[];

			const childFrame = createBaseFrame("Sections");
			childFrame.itemSpacing = 16;

			// childFrame.appendChild(createTextNode(section.name + "→", 32, font, section.id));
			childFrame.appendChild(createTextNode(section.name, 32, font, FILL_PRIMARY, section.id));
			childSections.forEach((child) => {
				childFrame.appendChild(createTextNode("⤑ " + child.name, 24, font, FILL_SECONDARY, child.id));
			});

			sectionAutoLayout.appendChild(childFrame);
		}
		return sectionAutoLayout;
	}

	// Position in viewport
	const center = figma.viewport.center;
	tocFrame.x = center.x - tocFrame.width / 2;
	tocFrame.y = center.y - tocFrame.height / 2;

	figma.currentPage.appendChild(tocFrame);
	return tocFrame;
}

async function main({ command }: { command: string }) {
	const notification = figma.notify("Generating Table of Contents...", {
		timeout: 10000,
	});

	try {
		const tocFrame = await generateTableOfContents(command === "generate");
		figma.viewport.scrollAndZoomIntoView([tocFrame]);
		notification.cancel();
		figma.notify("Table of Contents created!", { timeout: 2000 });
	} catch (error) {
		figma.notify("Error creating Table of Contents", { error: true });
	} finally {
		figma.closePlugin();
	}
}
figma.on("run", main);
